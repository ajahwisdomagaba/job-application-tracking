export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
    let message = err.message || 'Internal Server Error';

    if (err.name === 'MulterError') {
      statusCode = 400;
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = `File exceeds the ${process.env.MAX_ATTACHMENT_SIZE_MB || 10} MB limit`;
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        message = 'Use a single file in the file form-data field';
      }
    }
  
    if (err.code === 11000) {
      statusCode = 400;
      const field = Object.keys(err.keyValue)[0];
      message = `Duplicate value entered for ${field}. It must be unique.`;
    }
  
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = Object.values(err.errors).map((val) => val.message).join(', ');
    }
  
    if (err.name === 'CastError') {
      statusCode = 400;
      message = `Resource not found with id of ${err.value}`;
    }
  
    res.status(statusCode).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
